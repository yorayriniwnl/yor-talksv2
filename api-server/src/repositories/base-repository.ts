export abstract class BaseRepository<T> {
  protected readonly memory = new Map<string, T>();

  protected getAll(): T[] {
    return Array.from(this.memory.values());
  }

  protected set(id: string, entity: T): T {
    this.memory.set(id, entity);
    return entity;
  }

  protected get(id: string): T | undefined {
    return this.memory.get(id);
  }

  protected delete(id: string): boolean {
    return this.memory.delete(id);
  }
}
