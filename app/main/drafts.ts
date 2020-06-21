const a = ({ electronStore, electronStoreOpts } = {electronStore: '', electronStoreOpts: ''}) => {
    const store = electronStore 
  
    return {
      get store() {
        return store
      },
      getItem: (key) => {
        return new Promise((resolve) => {
          resolve(store.get(key))
        })
      },
      setItem: (key, item) => {
        return new Promise((resolve) => {
          resolve(store.set(key, item))
        })
      },
      removeItem: (key) => {
        return new Promise((resolve) => {
          resolve(store.delete(key))
        })
      }
    }
  }
  const b = a()
