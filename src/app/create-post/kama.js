"use client";
import { useState, useEffect, useRef } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  uploadString,
} from "firebase/storage";
import { serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase-config";
import "react-quill/dist/quill.snow.css";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FaPlus } from "react-icons/fa";
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
const Page = () => {
  const [value, setValue] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [imageAlt, setImageAlt] = useState("");
  const [title, setTitle] = useState("");
  

  const router = useRouter();
  const createPost = async () => {
    setCreatingPost(true);

    const postTitle = document.getElementById("postTitle").value;
    // Use the Quill content from state
    let quillValue = value;

    const postsCollectionRef = collection(db, "BlogPosts");
    // Replace base64-encoded images with URLs
    quillValue = await replaceBase64Images(quillValue);

    // Remove <p> tags around images
    quillValue = quillValue
      .replace(/<p><img/g, "<img")
      .replace(/><\/p>/g, "/>")
      .replace(/<h[1-4]><img/g, "<img");

    // Create a new BlogPost document
    const docRef = await addDoc(postsCollectionRef, {
      title: title || "My First Blog Post", // Default title if user input is empty
      authorId: auth.currentUser?.uid || "Unknown",
      contentData: quillValue,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const storage = getStorage();
    const titleRef = ref(storage, `titles/${docRef.id}`);
    await uploadString(titleRef, postTitle || "My First Blog Post", "raw");

    // Set a timeout to hide the popup and navigate to the home page
    setTimeout(() => {
      setShowPopup(false);
      router.push("/");
    }, 3000);
  };
  const replaceBase64Images = async (quillValue, altText) => {
    const regex = /<img[^>]+src="([^">]+)"/g;
    const matches = quillValue.match(regex);

    if (!matches) {
      return quillValue;
    }

    const storage = getStorage();

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const imageUrl = match.replace(/<img[^>]+src="([^">]+)"/, "$1");

      if (imageUrl.startsWith("data:image")) {
        const response = await fetch(imageUrl);
        const imageBlob = await response.blob();

        const uniqueIdentifier = Date.now();
        const imageRef = ref(
          storage,
          `images/temp_image_${uniqueIdentifier}_${i + 1}.png`
        );

        await uploadBytes(imageRef, imageBlob);

        quillValue = quillValue.replace(
          match,
          `<img src="${await getDownloadURL(imageRef)}" alt="${imageAlt}"`
        );
      }
    }

    return quillValue;
  };

  const handleImageClick = (imageUrl, altText) => {
    setSelectedImage({ imageUrl, altText });
    setImageAlt(altText || "");
    console.log(altText);
    setShowPopup(true);
  };
  const handleUpdateAlt = async () => {
    setShowPopup(false);
  };
  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleTitleClick = () => {
    // Clear the title when the input is clicked
    setTitle('');
   
  };


  useEffect(() => {
    const quillEditor = document.querySelector(".ql-editor");

    if (quillEditor) {
      const handleEditorClick = (event) => {
        const isImage = event.target.tagName === "IMG";
        if (isImage) {
          handleImageClick(event.target.src, event.target.alt);
        }
      };

      quillEditor.addEventListener("click", handleEditorClick);

      // Remove the event listener when the component is unmounted
      return () => {
        quillEditor.removeEventListener("click", handleEditorClick);
      };
    }
  }, [handleImageClick]);

  return (
    <div className="flex relative max-w-[740px] mx-auto h-full flex-col justify-center items-center">
      <div className="w-full mt-4 flex justify-center items-center place-items-start">
        <span className="text-3xl mr-2 cursor-pointer" onClick={handleTitleClick}>
          <FaPlus className="text-gray-300" />
        </span>
        <input
          type="text"
          id="postTitle"
          value={title}
          onChange={handleTitleChange}
          onClick={handleTitleClick}
          placeholder="Title"
          className="w-full h-12 text-4xl px-4 text-gray-600 border-l-2 border-gray-300 focus:outline-none"
          autoComplete="off"
        />
      </div>
      <ReactQuill
        className="h-auto rounded-full"
        theme="snow"
        value={value}
        onChange={setValue}

        modules={{
          toolbar: [
            [{ header: [1, 2, 3, 4, false] }],
            ["bold", "italic", "underline", "strike", "blockquote"],
            [
              { list: "ordered" },
              { list: "bullet" },
              { indent: "-1" },
              { indent: "+1" },
            ],
            ["link", "image"],
            ["clean"],
          ],
          clipboard: {
            matchVisual: false,
          },
        }}
        formats={[
          "header",
          "bold",
          "italic",
          "underline",
          "strike",
          "blockquote",
          "list",
          "bullet",
          "indent",
          "link",
          "image",
        ]}
      />
      <button
        onClick={createPost}
        className="w-20 mt-16 rounded flex justify-center bg-gray-600 text-white py-4 px-20 text-center text-base cursor-pointer"
      >
        Save
      </button>

      {showPopup && (
        <div className="bg-gray-200 rounded absolute h-20 flex justify-center items-center py-4 px-4">
          <input
            type="text"
            placeholder="Enter alt text"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            className="py-1 px-2 rounded"
          />
          <div className="px-2">
            <button
              className="bg-black text-white px-1 py-1 rounded text-sm mr-2"
              onClick={handleUpdateAlt}
            >
              Update
            </button>
            <button
              className="bg-black text-white px-1 py-1 rounded text-sm "
              onClick={() => setShowPopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
