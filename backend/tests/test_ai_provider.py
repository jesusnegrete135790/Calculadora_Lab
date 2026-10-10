import httpx
import pytest
from pydantic import SecretStr
from app.core.config import get_settings
from app.services import ai_service


@pytest.mark.parametrize('case,expected', [('ok',200),('timeout',504),('disconnect',502),('limit',429),('unauthorized',502),('empty',502),('invalid-json',502)])
def test_provider_failures(client, headers, monkeypatch, case, expected):
    config=get_settings().model_copy(update={'gemini_api_key':SecretStr('synthetic-provider-test-key'),'ai_model':'synthetic-test-model'})
    monkeypatch.setattr(ai_service,'get_settings',lambda:config)
    original_client=httpx.AsyncClient
    def handler(request):
        assert request.url.path == '/v1beta/models/synthetic-test-model:generateContent'
        assert request.headers.get('x-goog-api-key') == 'synthetic-provider-test-key'
        payload=request.read().decode()
        assert 'systemInstruction' in payload and 'generationConfig' in payload
        if case=='timeout': raise httpx.ReadTimeout('test',request=request)
        if case=='disconnect': raise httpx.ConnectError('test',request=request)
        if case=='limit': return httpx.Response(429)
        if case=='unauthorized': return httpx.Response(401,json={'error':'provider private details must not escape'})
        if case=='invalid-json': return httpx.Response(200,text='not JSON')
        if case=='empty': return httpx.Response(200,json={'candidates':[]})
        return httpx.Response(200,json={'candidates':[{'content':{'parts':[{'text':'Respuesta de prueba'}]}}]})
    monkeypatch.setattr(ai_service.httpx,'AsyncClient',lambda **kwargs:original_client(transport=httpx.MockTransport(handler),**kwargs))
    response=client.post('/api/asistente/preguntar',headers=headers,json={'pregunta':'Explica la media','moduloRelacionado':'Probabilidad y estadística'})
    assert response.status_code==expected
    assert 'provider private' not in response.text
    assert len(client.get('/api/asistente/historial',headers=headers).json()) == (1 if case=='ok' else 0)
