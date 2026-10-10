import { createContext } from 'react';
import type { UserSession } from './types';
export const SessionContext = createContext<UserSession | null>(null);
