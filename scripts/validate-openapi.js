import SwaggerParser from '@apidevtools/swagger-parser';
await SwaggerParser.validate('docs/openapi.json');
console.log('OpenAPI 3.0.3 validado.');
