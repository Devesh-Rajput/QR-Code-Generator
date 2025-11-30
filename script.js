// Get elements by their ID
let imgBox = document.getElementById("imgBox");
let qrImage = document.getElementById("qrImage");
let qrText = document.getElementById("qrText");
let container = document.querySelector(".container");

// Function to generate the QR code
function generateQR(){
    // Get the current text value
    const inputValue = qrText.value.trim();

    if(inputValue.length > 0){
        // 1. Start the 'Removing' Animation
        
        // Remove the show-img class to start the max-height: 0 collapse animation.
        // This is the "removing animation of the first qr"
        imgBox.classList.remove("show-img");
        
        // Use a slight delay (matching the CSS transition time, which is 1s, 
        // but 500ms is often enough to visually see the collapse)
        setTimeout(() => {
            // This code runs AFTER the removal animation has played

            // 2. Generate the New QR Code
            const data = encodeURIComponent(inputValue);
            qrImage.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + data;

            // 3. Start the 'Generating' Animation
            
            // Re-add the class to start the max-height expansion animation.
            // This is the "animation of generating new qr"
            imgBox.classList.add("show-img");

            // Optional: Add a subtle animation/jiggle to the container when generated
            container.classList.add("jiggle");
            setTimeout(() => {
                container.classList.remove("jiggle");
            }, 300);
            
        }, 500); // 500ms delay to allow the removal animation to begin/finish.

    } else {
        // Handle empty input error state (shake)
        qrText.classList.add('error');
        setTimeout(()=>{
            qrText.classList.remove('error');
        },1000);
        
        // Ensure the old QR code is hidden if the input is empty
        imgBox.classList.remove("show-img");
        
        alert("Please enter text or a URL to generate a QR code.");
    }
}