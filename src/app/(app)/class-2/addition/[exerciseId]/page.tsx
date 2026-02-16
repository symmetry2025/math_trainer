'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={2} op="addition" basePath="/class-2/addition" exerciseId={props.params.exerciseId} />;
}

