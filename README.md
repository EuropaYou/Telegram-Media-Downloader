# I wrote this userscript two years ago and it's of no use to me now.

I wrote this userscript two years ago and it's of no use to me now. This script downloads media from Telegram's web interface. It includes various functionalities such as automatic message checking, downloading media files, and managing download counts. Since I have wrote this script two years ago many functions doesn't work. You can fix them by contributing

If anyone wants to use these features, you can use my fork. However, please note that my fork is very old and I no longer maintain or use it myself. The userscript was created two years ago to serve my own needs at the time.

While the script *may* function and may be useful for others, Please understand that it may contain bugs or have compatibility issues with Telegram web interface(s).

If you find the script helpful and would like to improve it, feel free to contribute to this project using my fork as a starting point. Pull requests and bug reports are welcome, and I will do my best to review and merge contributions.

# Documentation

I wrote this script mainly for web/k version don't have high expectations that this will work out of box.

## Variables and Settings:

- **autocheckNewMessages**: If enabled userscript *should* (I don't know if it will work) check for new messages. It works for:
    -  Photo, Video, Round Videos and Audios.
 
- **newAutocheckNewMessages**: If enabled, it checks for new (media) messages. It works for:
    - Photo and Video.

- **downloadTextMessages**: If enabled, it downloads text messages. It works for:
    - Text messages.
    
- **dontCareIfDownloaded**: If enabled, it forces media to download. It works for:
    - Any downloadable media.

- **autoGrid**: If enabled and chat's media tab is open it hides visibility of media items in the chat's media tab. **It is highly experimental and has no use *for now***.

- **autodownload**: If enabled and media player is open. It downloads media It works for:
    - Photo and Video.

- **goPrevious**: If enabled it clicks previous button (in media player). If enabled with **autodownload** it allows users to automatically download media.

- **goNext**:  If enabled it clicks next button (in media player). If enabled with **autodownload** it allows users to automatically download media.

- **previousVideoURL**, **previousImageURL**, and **_previousImageURL**: String used to store the URLs of previously downloaded media items.

- **downloadCount**: Variable used to display how many downloads are taking place. Can be used to control concurrent downloads.

## Functions

### Config Functions

- **toggleBooleanValue**: Function that toggles on and off, of a given boolean variable.

- **toggleAutocheckNewMessages**, **toggleDownloadTextMessages**, **toggleAutodownload**, **toggleNewAutocheckNewMessages**, and **toggleDontCareIfDownloaded**: Functions that toggle their respective boolean variables and rebuild the menu (Mentioned later).

- **rebuildMenu**: Function that unregisters and re-registers the menu commands to reflect changes in the script settings.

### Download Functions:

When a video download starts, both **downloadCount** and **totalDownloadCount** are incremented. After the download process is completed, whether successful or not, **downloadCount** is decremented. This ensures that the count accurately reflects the number of ongoing downloads at any given time.

If download failed it should print what happened.

All download functions checks if media has been downloaded already. Which you can disable by setting **dontCareIfDownloaded** to true.

- **tel_download_video**: Downloads a video from Telegram.

    > Parameters: url, _chatName, _sender.

    ```This function checks if the video has already been downloaded and skips the download if dontCareIfDownloaded is true. It fetches the video in parts, concatenates the blobs, and saves the file.```

- **tel_download_audio**: Downloads an audio file from Telegram.

    > Parameters: url, _chatName, _sender.

    ```Similar to tel_download_video, but for audio files. It fetches the audio in parts, concatenates the blobs, and saves the file.```

- **tel_download_gif**: Downloads a GIF from Telegram.

    > Parameters: url, _chatName, _sender.

    ```Fetches the GIF in parts, concatenates the blobs, and saves the file.```

- **tel_download_image**: Downloads an image from Telegram.

    > Parameters: imageUrl, _chatName, _sender.

    ```Directly downloads the image by creating a link and triggering a download.```

### Navigation Functions

- **goCheck**: Navigates between media items based on the **goPrevious** and **goNext** variables.

    ```Clicks on the left or right navigation buttons in the media viewer to switch between media items.```

### Utility Functions

- **isPeerTitleEqualsTo**: Checks if the peer title matches a given variable.

    > Parameters: variable.
    
    ```Used to check if the peer title matches a specific string or array of strings.```

- **createImageButtons**: Creates buttons for downloading images.

    > Parameters: ele, imageUrl.
    
    ```Creates a container with download and open-in-new-tab buttons for images.```
