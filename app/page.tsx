'use client';

import {
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  useSession,
  useUser,
} from '@clerk/nextjs';
import { neon } from '@neondatabase/serverless';
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';

const DATABASE_URL = process.env.NEXT_PUBLIC_DATABASE_URL!;
const JWT_TEMPLATE = process.env.NEXT_PUBLIC_JWT_TEMPLATE!;

export default function Home() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [todos, setTodos] = useState<Array<Todo>>([]);

  return (
    <>
      <Header />
      {!isLoaded ? (
        <></>
      ) : (
        <main className={styles.main}>
          <div className={styles.container}>
            {isSignedIn ? (
              <>
                <div className={styles.label}>Welcome {user.firstName}!</div>
                <AddTodoForm todos={todos} setTodos={setTodos} />
                <TodoList todos={todos} setTodos={setTodos} />
                <SignOutButton />
              </>
            ) : (
              <div className={styles.label}>
                Sign in to create your todo list!
                <SignInButton />
                <SignUpButton />
              </div>
            )}
          </div>
        </main>
      )}
    </>
  );
}

const Header = () => {
  const { isSignedIn } = useUser();

  return (
    <header className={styles.header}>
      <div>My Todo App</div>
      {isSignedIn ? <UserButton /> : null}
    </header>
  );
};

type Todo = {
  id: string;
  task: string;
  is_complete: boolean;
  inserted_at: Date;
};

const TodoList = ({
  todos,
  setTodos,
}: {
  todos: Array<Todo>;
  setTodos: (todos: Array<Todo>) => void;
}) => {
  const [loadingTodos, setLoadingTodos] = useState(true);
  const { session } = useSession();

  // on first load, fetch and set todos
  useEffect(() => {
    const loadTodos = async () => {
      try {
        setLoadingTodos(true);

        if (!session) {
          throw new Error('No session');
        }

        const authToken = await session.getToken({
          template: JWT_TEMPLATE,
        });

        if (!authToken) {
          throw new Error('No auth token');
        }

        const sql = neon(DATABASE_URL, {
          authToken: () =>
            session.getToken({
              template: JWT_TEMPLATE,
            }) as Promise<string>,
        });

        const todos = (await sql(`select * from todos`)) as Array<Todo>;
        setTodos(todos);
      } catch (e) {
        alert(e);
      } finally {
        setLoadingTodos(false);
      }
    };
    loadTodos();
  }, []);

  // if loading, just show basic message
  if (loadingTodos) {
    return <div className={styles.label}>Loading...</div>;
  }

  // display all the todos
  return (
    <>
      {todos?.length > 0 ? (
        <div className={styles.todoList}>
          <ol>
            {todos.map((todo) => (
              <li key={todo.id}>{todo.task}</li>
            ))}
          </ol>
        </div>
      ) : (
        <div className={styles.label}>You don&apos;t have any todos!</div>
      )}
    </>
  );
};

function AddTodoForm({
  todos,
  setTodos,
}: {
  todos: Array<Todo>;
  setTodos: (todos: Array<Todo>) => void;
}) {
  const { session } = useSession();
  const [newTodo, setNewTodo] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!session) {
      throw new Error('No session');
    }

    if (newTodo === '') {
      return;
    }

    const authToken = await session.getToken({
      template: JWT_TEMPLATE,
    });

    if (!authToken) {
      throw new Error('No auth token');
    }

    const sql = neon(DATABASE_URL, {
      authToken,
    });
    const data = (await sql(
      `INSERT INTO todos (task, user_id, is_complete) VALUES ($1, $2, $3) RETURNING *`,
      [newTodo, session.user.id, false]
    )) as Array<Todo>;

    setTodos([...todos, data[0]]);
    setNewTodo('');
  };
  return (
    <form onSubmit={handleSubmit}>
      <input onChange={(e) => setNewTodo(e.target.value)} value={newTodo} />
      &nbsp;<button>Add Todo</button>
    </form>
  );
}
