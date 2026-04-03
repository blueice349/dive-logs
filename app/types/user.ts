export type User = {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type PublicUser = Omit<User, "password">;

export const toPublicUser = ({ password: _, ...rest }: User): PublicUser => rest;
