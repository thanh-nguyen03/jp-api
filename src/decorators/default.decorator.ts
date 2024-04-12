import { Transform, TransformOptions } from 'class-transformer';

export const Default = (value: any, options?: TransformOptions) =>
  Transform((params) => params.value ?? value, options);
