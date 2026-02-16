'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return (
    <ClassOperationTrainerPage grade={3} op="multiplication" basePath="/class-3/multiplication" exerciseId={props.params.exerciseId} />
  );
}

