'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={3} op="addition" basePath="/class-3/addition" exerciseId={props.params.exerciseId} />;
}

