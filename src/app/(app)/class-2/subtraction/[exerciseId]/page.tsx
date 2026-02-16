'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={2} op="subtraction" basePath="/class-2/subtraction" exerciseId={props.params.exerciseId} />;
}

