import { redirect } from 'next/navigation';

export default function Page(props: { params: { blockId: string } }) {
  const id = encodeURIComponent(String(props.params.blockId || '').trim());
  redirect(`/class-3/addition/${id}`);
}

