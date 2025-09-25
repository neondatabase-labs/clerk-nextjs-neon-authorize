import { AddTodoForm } from "@/app/add-todo";
import { Header } from "@/app/header";
import { TodoList } from "@/app/todo-list";

import { auth } from "@clerk/nextjs/server";
import styles from "../styles/Home.module.css";

export default async function Home() {
  const { getToken } = await auth();
  const authToken = await getToken();

  let content = null;
  if (authToken) {
    content = (
      <main className={styles.main}>
        <div className={styles.container}>
          <AddTodoForm />
          <TodoList />
        </div>
      </main>
    );
  }

  return (
    <>
      <Header />
      {content}
    </>
  );
}
