import LoginClient from './LoginClient';

export default function Page(props: any) {
  return <LoginClient searchParams={props.searchParams} />;
}
