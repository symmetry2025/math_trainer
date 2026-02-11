declare module 'bcryptjs' {
  const bcrypt: {
    hash(data: string, saltOrRounds: number | string): Promise<string>;
    compare(data: string, encrypted: string): Promise<boolean>;
  } & Record<string, unknown>;

  export default bcrypt;
}

