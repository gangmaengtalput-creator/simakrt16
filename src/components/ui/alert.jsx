import * as React from "react"

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => {
  // Menentukan warna berdasarkan variant (default atau destructive/error)
  const variantClasses = variant === "destructive" 
    ? "border-red-500/50 text-red-500 dark:border-red-500 [&>svg]:text-red-500"
    : "text-gray-900 bg-white dark:bg-gray-900 dark:text-gray-100"

  return (
    <div
      ref={ref}
      role="alert"
      className={`relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-gray-950 dark:border-gray-800 dark:[&>svg]:text-gray-50 ${variantClasses} ${className || ""}`}
      {...props}
    />
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className || ""}`}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className || ""}`}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }