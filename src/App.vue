<template>
  <!-- Main container -->
  <div class="container mx-auto p-4">

    <!-- Remove Idea Modal -->
    <teleport to="body">
      <RemoveIdea
          v-if="isModalActive"
          :name="ideaToRemove.name"

          @remove-ok="removeIdea"
          @remove-cancel="isModalActive = !isModalActive"
      />
    </teleport>

    <!-- Main box -->
    <div class="w-full bg-gray-100 shadow-lg p-4 rounded-lg">
      <h1 class="mb-5 text-4xl text-center">IdeaBox</h1>

      <!-- Add Idea -->
      <AddIdea
          :user="user"
          @do-login="doLogin"
          @do-logout="doLogout"
          @add-idea="addIdea"

      />
      <!-- End of Add Idea -->

      <!-- Idea Item -->
      <transition-group name="list-complete">
        <AppIdea
            v-for="idea in ideas"
            :key="idea.createdAt"
            :idea="idea"
            :user="user"
            @vote-idea="voteIdea"
            @remove-idea="showRemoveIdeaModal"
            class="idea"
        />
      </transition-group>

      <!-- End of Idea item -->
    </div>
    <!-- End of main box -->
  </div>
  <!-- End of main container -->
</template>

<script>
import AppIdea from "@/components/AppIdea";
import AddIdea from "@/components/AddIdea";
import { auth, db, firebase } from "@/firebase.js";
import { ref, defineAsyncComponent } from "vue";

const RemoveIdea = defineAsyncComponent(() => import("@/components/RemoveIdea.vue"));
export default {
  name: "App",
  components: {
    AppIdea,
    AddIdea,
    RemoveIdea
  },
  setup() {
    //user
    const user = ref(null);
    auth.onAuthStateChanged(async auth => {
      let userVotes;
      if (auth) {
        user.value = auth;
        userVotes = db
            .collection("votes")
            .doc(user.value.uid)
            .onSnapshot(doc => {
              if (doc.exists) {
                let document = doc.data();
                if ("ideas" in document) {
                  user.value.votes = document.ideas;
                }
              }
            });
      } else {
        user.value = null;
        userVotes && userVotes();
      }
    });
    const doLogin = async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        await auth.signInWithPopup(provider);
      } catch (error) {
        console.error(error);
      }
    };
    const doLogout = async () => {
      try {
        await auth.signOut();
      } catch (error) {
        console.error(error);
      }
    };


    //ideas
    const ideas = ref([]);
    const isModalActive = ref(false);
    let ideaToRemove = {};
    db.collection("ideas")
        .orderBy("votes", "desc")
        .onSnapshot(
            snapshot => {
              const newIdeas = [];
              snapshot.docs.forEach(doc => {
                let { name, user, userName, votes, createdAt } = doc.data();
                let id = doc.id;
                newIdeas.push({
                  name,
                  user,
                  userName,
                  votes,
                  id,
                  createdAt
                });
              });
              ideas.value = newIdeas;
            },
            error => console.error(error)
        );
    const addIdea = async data => {
      try {
        await db.collection("ideas").add({
          name: data.value,
          user: user.value.uid,
          userName: user.value.displayName,
          createdAt: Date.now(),
          votes: 0
        });
      } catch (error) {
        console.error(error);
      }
    };
    const voteIdea = async ({ id, type }) => {
      try {
        let votes = await db
            .collection("votes")
            .doc(user.value.uid)
            .get();

        if (votes.exists) {
          votes = votes.data().ideas;
          if (votes.find(vote => vote === id)) {
            throw new Error("User already voted!");
          }
        }

        await db
            .collection("ideas")
            .doc(id)
            .update({
              votes: firebase.firestore.FieldValue.increment(type ? 1 : -1)
            });

        await db
            .collection("votes")
            .doc(user.value.uid)
            .set(
                {
                  ideas: firebase.firestore.FieldValue.arrayUnion(id)
                },
                {
                  merge: true
                }
            );
      } catch (error) {
        console.error(error);
      }
    };
    const showRemoveIdeaModal = async ({ name, id }) => {
      ideaToRemove.name = name;
      ideaToRemove.id = id;
      isModalActive.value = true;
    };
    const removeIdea = async () => {
      try {
        await
            db
                .collection("ideas")
                .doc(ideaToRemove.id)
                .delete();
        ideaToRemove = {};
        isModalActive.value = false;
      } catch (error) {
        console.error(error);
      }
    };
    return {
      ideas,
      user,
      isModalActive,
      ideaToRemove,
      doLogin,
      doLogout,
      addIdea,
      voteIdea,
      showRemoveIdeaModal,
      removeIdea
    };
  }
};
</script>
<style>
.idea {
  transition: all 0.8s ease;
}

.list-complete-enter-from,
.list-complete-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.list-complete-leave-active {
  position: absolute;
}

.list-complete-move {
  transition: transform 0.3s ease;
}

.idea {
  @apply bg-gray-200;
}

.idea:nth-of-type(1) {
  @apply bg-red-500;
}

.idea:nth-of-type(2) {
  @apply bg-red-400;
}

.idea:nth-of-type(3) {
  @apply bg-red-300;
}

.idea:nth-of-type(4) {
  @apply bg-red-200;
}

.idea:nth-of-type(5) {
  @apply bg-red-100;
}

.user-actions {
  @apply mt-2 text-center;
}

.user-actions a {
  font-weight: bold;
  text-decoration: underline;
}
</style>