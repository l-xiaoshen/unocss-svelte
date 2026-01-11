<script lang="ts">
import Test1 from "./Test1.svelte"
import Test2 from "./Test2.svelte"
</script>

<div class="">
    <Test1 />
    <Test2 />
</div>

<button class="bg-red-500 disabled:bg-blue-500" disabled>
    Click me
</button>


<style>
    div {
        @apply bg-blue-500;
    }
</style>