from typing import Protocol
import httpx
from fastapi import HTTPException
from app.core.config import get_settings


class AIProvider(Protocol):
    async def answer(self, question: str, module: str) -> str: ...


class GeminiProvider:
    async def answer(self, question: str, module: str) -> str:
        settings = get_settings()
        if not settings.gemini_api_key.get_secret_value() or not settings.ai_model:
            raise HTTPException(503, 'El asistente no está configurado. Las calculadoras siguen disponibles.')
        try:
            async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.gemini_api_base_url.rstrip('/')}/models/{settings.ai_model}:generateContent",
                    headers={'x-goog-api-key': settings.gemini_api_key.get_secret_value()},
                    json={
                        'systemInstruction': {'parts': [{'text': f'Eres un tutor de {module}. Explica en español paso a paso. No inventes resultados ni solicites datos privados.'}]},
                        'contents': [{'role': 'user', 'parts': [{'text': question}]}],
                        'generationConfig': {'maxOutputTokens': 1200},
                    },
                )
        except httpx.TimeoutException:
            raise HTTPException(504, 'El asistente tardó demasiado en responder') from None
        except httpx.RequestError:
            raise HTTPException(502, 'No se pudo conectar con el proveedor de IA') from None
        if response.status_code == 429:
            raise HTTPException(429, 'El proveedor de IA alcanzó su límite. Intenta más tarde.')
        if response.is_error:
            raise HTTPException(502, 'El proveedor de IA no pudo procesar la pregunta')
        try:
            data = response.json()
            candidates = data.get('candidates', [])
            parts = candidates[0].get('content', {}).get('parts', []) if candidates else []
            answer = '\n'.join(part['text'] for part in parts if isinstance(part.get('text'), str)).strip()
            if not answer or len(answer) > 30000:
                raise ValueError()
            return answer
        except (ValueError, TypeError, KeyError, AttributeError):
            raise HTTPException(502, 'El proveedor devolvió una respuesta vacía o inválida') from None


def get_ai_provider() -> AIProvider:
    return GeminiProvider()
