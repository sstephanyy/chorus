export default class CacheStore {
    #cache
    constructor() {
        this.#cache = sessionStorage
    }

    get cache() {
        return this.#cache
    }

    isEmpty(obj) {
        return Object.keys(obj).length === 0 && obj.constructor === Object
    }

    getKey(key) {
        const result = this.#cache.getItem(key)
        try {
            return JSON.parse(result)
        } catch (error) {
            return result
        }
    }

    getValue({ key, value }) {
        const result = this.getKey(key)
        if (['object', 'string'].includes(typeof result) || (result && this.isEmpty(value)))
            return result

        return this.update({ key, value })
    }

    update({ key, value }) {
        if (value?.error) return

        const parsedValue = typeof value !== 'string' ? JSON.stringify(value) : value
        this.#cache.setItem(key, parsedValue || {})
        return this.getKey(key)
    }

    removeKey(key) {
        this.#cache.removeItem(key)
    }
}
