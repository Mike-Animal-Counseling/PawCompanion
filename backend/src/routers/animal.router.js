import {Router} from "express";
import {sample_animals, sample_tags} from '../data.js';

const router = Router();

router.get('/', (req, res) => {
    res.send(sample_animals);
});

router.get('/tags', (req,res) => {
    res.send(sample_tags);
});

router.get('/search/:searchTerm', (req,res) => {
    const {searchTerm} = req.params;
    const animals = sample_animals.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    res.send(animals);
})

router.get('/tag/:tag', (req, res) => {
    const {tag} = req.params;
    const animals = sample_animals.filter(item =>
        item.tags?.includes(tag));
    res.send(animals);
});

router.get('/:animalId', (req,res) => {
    const {animalId} = req.params;
    const animal = sample_animals.find(item => item.id === animalId);
    res.send(animal);
})



export default router;

