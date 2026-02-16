'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={4} op="subtraction" basePath="/class-4/subtraction" exerciseId={props.params.exerciseId} />;
}

