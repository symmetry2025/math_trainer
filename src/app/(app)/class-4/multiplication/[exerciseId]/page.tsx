'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return (
    <ClassOperationTrainerPage grade={4} op="multiplication" basePath="/class-4/multiplication" exerciseId={props.params.exerciseId} />
  );
}

