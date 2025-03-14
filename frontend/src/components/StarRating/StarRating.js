import React from 'react'
import classes from './starRating.module.css'

export default function StarRating({stars, size}) {
  const styles = {
    width:size+'px',
    height:size+'px',
    marginRight: size/16 + 'px'
  };

  function Star({number}) {
    const half_number = number - 0.5

    return stars >= number ? (
      <img src='/full.png' style = {styles} alt = {number} />
     ): stars >= half_number ? (
        <img src='/half.png' style = {styles} alt = {number} />
     ): (
        <img src='/empty.png' style = {styles} alt = {number} />
     );
  };

  return (<div className = {classes.rating}>
    {
      [1,2,3,4,5].map(number => (
        <Star key = {number} number = {number}/>
        ))}
  </div>
  );
}

StarRating.defaultProps = {
  size:50,
};
