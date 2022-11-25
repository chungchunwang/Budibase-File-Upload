<script>
    import Component from "../src/Component.svelte"
    import Boundary from "./Boundary.js"
</script>

<Boundary>
  <Component {...$$props}>
    <slot/>
  </Component>
</Boundary>