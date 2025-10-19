import { page } from '@superhighway/loom'
import { createElement } from '@superhighway/silk'

export default page((request, { status }) => (
  <html lang="en">
    <head>
      <title>Error</title>
      <link rel="stylesheet" href="style.css" />
    </head>
    <body>Something went wrong.</body>
  </html>
))
