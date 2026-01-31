import { RequestHandler } from 'express';
import z, { ZodSchema } from 'zod';

import { BadRequestError } from './../core/ApiError';
// import { isProduction } from '../config.js';
import { ValidationSource } from './../helpers/validator';

// type ValidationErrorDetail = {
//     field: string;
//     message: string;
//     value?: unknown;
// };

// const formatFieldName = (path: (string | number)[]): string => {
//     if (path.length === 0) return 'body';

//     return path
//         .map((segment, index) => {
//             if (typeof segment === 'number') {
//                 return `[${segment}]`;
//             }
//             // Convert camelCase to readable format
//             const readable = segment.replace(/([A-Z])/g, ' $1').toLowerCase();
//             return index === 0 ? readable : segment;
//         })
//         .join('.');
// };

// const getReadableErrorMessage = (
//     code: string,
//     path: (string | number)[],
//     message: string,
//     received?: unknown,
//     expected?: string[],
// ): string => {
//     const fieldName = formatFieldName(path);

//     switch (code) {
//         case 'invalid_type':
//             if (received === 'undefined' || received === 'null') {
//                 return `${fieldName} is required`;
//             }
//             return `${fieldName} must be a valid ${expected}`;

//         case 'invalid_string':
//             if (message.includes('email')) {
//                 return `${fieldName} must be a valid email address`;
//             }
//             if (message.includes('url')) {
//                 return `${fieldName} must be a valid URL`;
//             }
//             if (message.includes('uuid')) {
//                 return `${fieldName} must be a valid UUID`;
//             }
//             return `${fieldName} format is invalid`;

//         case 'too_small':
//             if (message.includes('String')) {
//                 const minMatch = message.match(/at least (\d+)/);
//                 const min = minMatch ? minMatch[1] : 'minimum';
//                 return `${fieldName} must be at least ${min} characters long`;
//             }
//             if (message.includes('Number')) {
//                 const minMatch = message.match(
//                     /greater than or equal to (\d+)/,
//                 );
//                 const min = minMatch ? minMatch[1] : 'minimum value';
//                 return `${fieldName} must be greater than or equal to ${min}`;
//             }
//             if (message.includes('Array')) {
//                 const minMatch = message.match(/at least (\d+)/);
//                 const min = minMatch ? minMatch[1] : 'minimum';
//                 return `${fieldName} must contain at least ${min} item(s)`;
//             }
//             return message;

//         case 'too_big':
//             if (message.includes('String')) {
//                 const maxMatch = message.match(/at most (\d+)/);
//                 const max = maxMatch ? maxMatch[1] : 'maximum';
//                 return `${fieldName} must be at most ${max} characters long`;
//             }
//             if (message.includes('Number')) {
//                 const maxMatch = message.match(/less than or equal to (\d+)/);
//                 const max = maxMatch ? maxMatch[1] : 'maximum value';
//                 return `${fieldName} must be less than or equal to ${max}`;
//             }
//             if (message.includes('Array')) {
//                 const maxMatch = message.match(/at most (\d+)/);
//                 const max = maxMatch ? maxMatch[1] : 'maximum';
//                 return `${fieldName} must contain at most ${max} item(s)`;
//             }
//             return message;

//         case 'invalid_enum_value':
//             const options = expected?.join(', ') || 'valid options';
//             return `${fieldName} must be one of: ${options}`;

//         case 'unrecognized_keys':
//             const keys = message.match(
//                 /Unrecognized key\(s\) in object: (.+)/,
//             )?.[1];
//             return keys
//                 ? `Unexpected field(s): ${keys}`
//                 : 'Unexpected fields in request';

//         case 'invalid_date':
//             return `${fieldName} must be a valid date`;

//         case 'invalid_literal':
//             return `${fieldName} must be exactly ${expected}`;

//         case 'custom':
//             return message; // Custom error messages are already descriptive

//         default:
//             return message || `${fieldName} is invalid`;
//     }
// };

// type ZodSafeError = {
//     path: string[];
//     code: string;
//     message: string;
//     expected: string[];
// };

export const validator = (
    schema: ZodSchema,
    source: ValidationSource,
): RequestHandler => {
    return (req, _res, next): void => {
        const schemaToBeValidated = source === ValidationSource.REQUEST ? req : req[source];

        const result = schema.safeParse(schemaToBeValidated);

        if (!result.success) {
            // const errors: ZodSafeError[] = JSON.parse(String(result.error));
            // const validationErrors: ValidationErrorDetail[] = errors.map(
            //     (err: {
            //         path: string[];
            //         code: string;
            //         message: string;
            //         expected: string[];
            //     }) => ({
            //         field: formatFieldName(err.path),
            //         message: getReadableErrorMessage(
            //             err.code,
            //             err.path,
            //             err.message,
            //             'received' in err ? err.received : undefined,
            //             'expected' in err ? err.expected : undefined,
            //         ),
            //         ...(!isProduction && {
            //             value: err.path.reduce(
            //                 (obj: Record<string, unknown>, key: string | number) => obj?.[key],
            //                 req.body,
            //             ),
            //         }),
            //     }),
            // );

            // const mainMessage =
            //     validationErrors.length === 1
            //         ? validationErrors[0].message
            //         : `Validation failed for ${validationErrors.length} field(s)`;

            return next(new BadRequestError(z.prettifyError(result.error)));
        }

        if (source !== ValidationSource.REQUEST) {
            Object.assign(req[source], result.data);
        }
        next();
    };
};
