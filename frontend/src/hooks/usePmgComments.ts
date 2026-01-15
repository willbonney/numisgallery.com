import { useState } from 'react';
import type { Banknote } from '../types/banknote';

export function usePmgComments(banknote?: Banknote) {
  const [pmgComments, setPmgComments] = useState<string[]>(() => {
    if (banknote?.pmgComments) {
      return banknote.pmgComments.split('\n').filter(c => c.trim());
    }
    return [''];
  });

  const handleAddComment = () => {
    setPmgComments([...pmgComments, '']);
  };

  const handleRemoveComment = (index: number) => {
    setPmgComments(pmgComments.filter((_, i) => i !== index));
  };

  const handleCommentChange = (index: number, value: string) => {
    const updated = [...pmgComments];
    updated[index] = value;
    setPmgComments(updated);
  };

  const getCommentsString = () => {
    return pmgComments.filter(c => c.trim()).join('\n');
  };

  const resetComments = () => {
    setPmgComments(['']);
  };

  const setComments = (comments: string[]) => {
    setPmgComments(comments.length > 0 ? comments : ['']);
  };

  return {
    pmgComments,
    handleAddComment,
    handleRemoveComment,
    handleCommentChange,
    getCommentsString,
    resetComments,
    setComments,
  };
}

