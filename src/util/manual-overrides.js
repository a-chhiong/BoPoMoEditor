let manualOverrides = {};

export const ManualOverrides = {
  get() {
    return manualOverrides;
  },

  set(value = {}) {
    manualOverrides = value;
    return manualOverrides;
  },

  clear() {
    manualOverrides = {};
    return manualOverrides;
  },

  update(key, value) {
    manualOverrides[key] = value;
    return manualOverrides;
  }
};
