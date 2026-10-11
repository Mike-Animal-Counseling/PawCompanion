import React, { useState } from 'react';

function ExpandContent({ text, maxLength }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div>
      <span>
        {expanded ? text : text.slice(0, maxLength)}
        {text.length > maxLength && (
          <span onClick={toggleExpanded}>
            {expanded ? '... [Show less]' : '... [Show more]'}
          </span>
        )}
      </span>
    </div>
  );
}

export default ExpandContent;