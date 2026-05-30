const shellCallbacks = {
  showToast: null,
  switchCandidateTab: null
};

export const ShellDelegate = {
  register(callbacks) {
    Object.assign(shellCallbacks, callbacks);
  },

  showToast(message) {
    if (typeof shellCallbacks.showToast === 'function') {
      shellCallbacks.showToast(message);
    }
  },

  switchCandidateTab(tab) {
    if (typeof shellCallbacks.switchCandidateTab === 'function') {
      shellCallbacks.switchCandidateTab(tab);
    }
  }
};
