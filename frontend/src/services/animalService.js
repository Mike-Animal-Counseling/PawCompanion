import { sample_animals, sample_tags } from "../data";

export const getAll = async () => sample_animals;

export const search = async searchTerm =>
    sample_animals.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

export const getAllTags = async () => sample_tags;

export const getAllByTag = async tag => {
    if (tag === 'All') return getAll();
    return sample_animals.filter(item => item.tags?.includes(tag));
};

export const getById = async animalId =>
    sample_animals.find(item => item.id === animalId);