export class BaseRepository {
    memory = new Map();
    getAll() {
        return Array.from(this.memory.values());
    }
    set(id, entity) {
        this.memory.set(id, entity);
        return entity;
    }
    get(id) {
        return this.memory.get(id);
    }
    delete(id) {
        return this.memory.delete(id);
    }
}
//# sourceMappingURL=base-repository.js.map