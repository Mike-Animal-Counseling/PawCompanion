import axios from "axios";

export const getAll = async () => {
    const {data} = await axios.get('/api/animals');
    return data;
};

export const search = async (searchTerm) => {
    const {data} = await axios.get('/api/animals/search/' + searchTerm);
    return data;
}
export const getAllTags = async () => {
    const {data} = await axios.get('/api/animals/tags');
    return data;
}

export const getAllByTag = async (tag) => {
    if (tag === 'All') return getAll();
    const {data} = await axios.get('/api/animals/tag/' + tag);
    return data;
};

export const getById = async (animalId) => {
    const {data} = await axios.get('/api/animals/' + animalId);
    return data;
};

