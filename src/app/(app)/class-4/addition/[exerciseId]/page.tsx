'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={4} op="addition" basePath="/class-4/addition" exerciseId={props.params.exerciseId} />;
}

