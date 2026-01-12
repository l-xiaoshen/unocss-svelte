<script>
let className
let variant
function cn() {}
</script>

<div
  class={cn(
    "a b c",
    variant === "ERROR" || variant === "ERROR"
      ? "d e f"
      : "g h i",
      variant ?? "j k l",
      variant && "m n o",
    className,
  )}
></div>
