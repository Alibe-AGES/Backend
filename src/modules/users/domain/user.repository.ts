import { User } from './user.entity';

export abstract class UserRepository {
  abstract create(user: User): Promise<User>;
  abstract findAll(): Promise<User[]>;
  abstract findById(id: string): Promise<User | null>;
  abstract update(user: User): Promise<User>;
  abstract delete(id: string): Promise<void>;
}
