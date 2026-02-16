'use client';

import { ClassOperationTrainerPage } from '../../../_classPages/ClassOperationTrainerPage';

export default function Page(props: { params: { exerciseId: string } }) {
  return <ClassOperationTrainerPage grade={3} op="division" basePath="/class-3/division" exerciseId={props.params.exerciseId} />;
}

