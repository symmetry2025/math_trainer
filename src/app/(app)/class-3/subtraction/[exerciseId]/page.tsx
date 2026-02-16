'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={3} op="subtraction" basePath="/class-3/subtraction" exerciseId={props.params.exerciseId} />;
}

