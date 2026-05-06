import { api } from './client';

export const Core = api.integrations.Core;

export const InvokeLLM              = (...args) => api.integrations.Core.InvokeLLM(...args);
export const SendEmail              = (...args) => api.integrations.Core.SendEmail(...args);
export const SendSMS                = (...args) => api.integrations.Core.SendSMS(...args);
export const UploadFile             = (...args) => api.integrations.Core.UploadFile(...args);
export const GenerateImage          = (...args) => api.integrations.Core.GenerateImage(...args);
export const ExtractDataFromUploadedFile = (...args) => api.integrations.Core.ExtractDataFromUploadedFile(...args);
