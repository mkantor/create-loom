import { page } from '@superhighway/loom'
import { createElement } from '@superhighway/silk'

export default page(request => (
  <html lang="en">
    <head>
      <title>Greeting</title>
      <link rel="stylesheet" href="style.css" />
    </head>
    <body>Hello, world!</body>
  </html>
))
