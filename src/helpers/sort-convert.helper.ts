import { Sort } from '../constants/sort';

const sortConvert = (sort: Sort[]) => {
  const orderBy = [];
  sort.forEach((s) => {
    orderBy.push({
      [s.field]: s.direction,
    });
  });

  return orderBy;
};

export default sortConvert;
