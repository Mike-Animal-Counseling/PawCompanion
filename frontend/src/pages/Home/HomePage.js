import React, { useEffect, useReducer } from "react";
import {
  getAll,
  search,
  getAllTags,
  getAllByTag,
} from "../../services/animalService";
import Thumbnails from "../../components/Thumbnails/Thumbnails";
import { useParams } from "react-router-dom";
import Search from "../../components/Search/Search";
import Tags from "../../components/Tags/Tags";
import NotFound from "../../components/NotFound/NotFound";

const initialState = { animals: [], tags: [], loading: true };

const reducer = (state, action) => {
  switch (action.type) {
    case "ANIMALS_LOADED":
      return { ...state, animals: action.payload, loading: false };
    case "TAGS_LOADED":
      return { ...state, tags: action.payload };
    default:
      return state;
  }
};

export default function HomePage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { animals, tags, loading } = state;
  const { searchTerm, tag } = useParams();

  useEffect(() => {
    getAllTags().then((tags) =>
      dispatch({ type: "TAGS_LOADED", payload: tags }),
    );

    const loadAnimal = tag
      ? getAllByTag(tag)
      : searchTerm
        ? search(searchTerm)
        : getAll();

    loadAnimal.then((animals) =>
      dispatch({ type: "ANIMALS_LOADED", payload: animals }),
    );
  }, [searchTerm, tag]);

  return (
    <>
      <Search />
      <Tags tags={tags} />
      {!loading && animals.length === 0 && <NotFound />}
      <Thumbnails animals={animals} />
    </>
  );
}
