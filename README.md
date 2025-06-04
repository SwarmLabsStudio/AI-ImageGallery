In order to run this project you will need to add a .env.local into your project.
It will need to contain the following entries.
Replace the values below to match your configuration. I have left these here because they are local and not at any risk.
NEXT_PUBLIC_BASEROW_API_TOKEN=8XRUFyobgyzmejT878P2LcSvu8h3WzkW
NEXT_PUBLIC_BASEROW_BASE_URL=http://host.docker.internal:85
NEXT_PUBLIC_BASEROW_IMAGES_TABLE_ID=693
//Change the url path below depending on if you are in test mode or production mode in N8N you can get the path from the webhook node.
NEXT_PUBLIC_WEBHOOK_IMAGE_GEN_URL=http://host.docker.internal:5678/webhook/image-gen-trigger

Setup Instructions for all the tools used can be found here: https://docs.google.com/document/d/1SG-uLUrk3G49uDfetPNLctTKVfdPzyymv2zYy3Ncpj8/edit?usp=drive_link
