import React, { useState } from 'react'
import classes from './Search.module.css'
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';


export default function Search() {
const [term, setTerm] = useState('');
const navigate = useNavigate();
const {searchTerm} = useParams();

useEffect(() => {
    setTerm(searchTerm ?? '');
}, [searchTerm])

const search = async () => {
    term? navigate('/search/'+term): navigate('/');
};
    return (
    <div className={classes.container}>
        <input type='text'
        placeholder='Search Your Animal Counselor!'
        onChange={e => setTerm(e.target.value)}
        onKeyUp={e => e.key === 'Enter' && search()}
        value = {term}
        />
        <button onClick={search}>🔍</button>
    </div>
  )
}
