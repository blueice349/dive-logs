export type User = {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  isAdmin: number; // SQLite INTEGER: 0 or 1
  isActive: number; // SQLite INTEGER: 0 = suspended, 1 = active
};

export type PublicUser = Omit<User, "password">;

export const toPublicUser = ({ password: _, ...rest }: User): PublicUser => rest;
