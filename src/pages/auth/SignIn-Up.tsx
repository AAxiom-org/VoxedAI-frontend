import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";

export default function SignInUp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Three.js Background
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 5;

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(posArray, 3),
    );

    // Use adaptive particle color based on color scheme
    const getParticleColor = () => {
      if (document.documentElement.classList.contains("force-light")) {
        return "#38bdf8"; // Sky color for light mode
      } else if (document.documentElement.classList.contains("force-dark")) {
        return "#38bdf8"; // Sky color for dark mode
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "#38bdf8"; // Sky color for dark mode
      } else {
        return "#38bdf8"; // Sky color for light mode
      }
    };

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.025, // Increased from 0.008 to make particles bigger
      color: getParticleColor(),
      transparent: true,
      opacity: 0.6,
    });

    const particlesMesh = new THREE.Points(
      particlesGeometry,
      particlesMaterial,
    );
    scene.add(particlesMesh);

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // Visibility API to pause animation when tab is not visible
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Animation with throttling
    let lastTime = 0;
    const fps = 30; // Limit to 30 FPS
    const interval = 1000 / fps;

    const animate = (currentTime: number) => {
      if (!isVisible) {
        requestAnimationFrame(animate);
        return;
      }

      const delta = currentTime - lastTime;

      if (delta > interval) {
        lastTime = currentTime - (delta % interval);

        particlesMesh.rotation.x += 0.0003;
        particlesMesh.rotation.y += 0.0003;
        renderer.render(scene, camera);
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    // Update particle color when color scheme changes
    const updateParticleColor = () => {
      particlesMaterial.color.set(getParticleColor());
    };

    // Listen for color scheme changes
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );
    darkModeMediaQuery.addEventListener("change", updateParticleColor);

    // Observer for class changes on html element
    const htmlElement = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          updateParticleColor();
        }
      });
    });

    observer.observe(htmlElement, { attributes: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      darkModeMediaQuery.removeEventListener("change", updateParticleColor);
      observer.disconnect();

      // Clean up THREE.js resources
      scene.remove(particlesMesh);
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, [isVisible]);

  return (
    <div className="w-full max-w-full min-h-screen bg-transparent color-primary overflow-x-hidden relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full z-[-1]"
      ></canvas>

      {/* Floating elements similar to landing page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute rounded-full bg-gradient-to-br from-sky-400 to-indigo-400 w-[300px] h-[300px] top-[20%] left-0 filter blur-[40px] opacity-30 z-1 animate-float1"></div>
        <div className="absolute rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 w-[400px] h-[400px] top-[50%] right-0 filter blur-[40px] opacity-30 z-1 animate-float2"></div>
        <div className="absolute rounded-full bg-gradient-to-br from-purple-400 to-sky-400 w-[250px] h-[250px] bottom-[10%] left-[10%] filter blur-[40px] opacity-30 z-1 animate-float3"></div>
      </div>

      <div className="text-center space-y-8 z-10 bg-secondary backdrop-blur-lg border border-adaptive rounded-xl p-12 shadow-adaptive max-w-md">
        <div>
          <h1 className="text-6xl font-bold color-primary mb-4">
            Vox
            <span className="font-black color-secondary">Ed</span>
          </h1>
          <p className="text-xl color-secondary max-w-md mx-auto">
            Experience the future of voice interaction
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <SignInButton
            mode="modal"
            fallbackRedirectUrl={"/sign-in"}
            forceRedirectUrl={"/spaces"}
          >
            <button className="bg-gradient-to-br from-sky-400 to-indigo-400 color-primary border-none py-3 px-6 rounded-lg font-semibold cursor-pointer transition duration-200 hover:translate-y-[-2px] hover:shadow-lg shadow-adaptive no-underline">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton
            mode="modal"
            fallbackRedirectUrl={"/sign-in"}
            forceRedirectUrl={"/spaces"}
          >
            <button className="bg-secondary color-primary border border-adaptive py-3 px-6 rounded-lg font-semibold cursor-pointer transition-all duration-200 hover-bg-adaptive hover:translate-y-[-2px] no-underline">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}
