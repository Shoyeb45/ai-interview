import OpenAI from 'openai';
import { azureOpenAICred } from '../../config';

export const azureOpenAI = new OpenAI({
    apiKey: azureOpenAICred.apiKey,
    baseURL: `${azureOpenAICred.baseUrl}/openai/deployments/${azureOpenAICred.deployment}`,
    defaultQuery: {
        'api-version': azureOpenAICred.apiVersion!,
    },
    defaultHeaders: {
        'api-key': azureOpenAICred.apiKey,
    },
});
