export const getAllTests = async (filters) => {
  const result = await window.electronAPI.getTests(filters);
  return result?.success ? result.tests : [];
};

export const getTest = async (id) => {
  return await window.electronAPI.getTest(id);
};

export const createTest = async (testData) => {
  return await window.electronAPI.createTest(testData);
};

export const updateTest = async (id, testData) => {
  return await window.electronAPI.updateTest(id, testData);
};

export const deleteTest = async (id) => {
  return await window.electronAPI.deleteTest(id);
};
