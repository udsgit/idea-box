import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import { serviceAccount } from "./../credentials";

firebase.initializeApp(serviceAccount);

const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db, firebase };
