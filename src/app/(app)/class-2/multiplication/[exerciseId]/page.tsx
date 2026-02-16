'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return (
    <ClassOperationTrainerPage grade={2} op="multiplication" basePath="/class-2/multiplication" exerciseId={props.params.exerciseId} />
  );
}

